const spreadSheetId = '1sEmOl37LLq9QEDWU3lxzscv_hlgI7bU59jB68e_AVQ0';
const apiKey = 'AIzaSyBN2NHvw_sfbgTMtYuX6rmQlJRYkXp1xbs';
const googleSheetApiRoot = `https://sheets.googleapis.com/v4/spreadsheets/${spreadSheetId}`;
const expandDivider = '_';
function initConfigurationFromTables(tables) {
  const parsedTables = tables.map(parseTableData);
  const decoupledTables = decoupleTableData(parsedTables);
  const sortedTables = sortTables(decoupledTables);
  const updatedTables = updateTables(sortedTables);
  initAttributeFromTables(updatedTables);
}
// parse relationTable and extract useful information
function parseTableData(relationTable) {
  const [dependAttrNameStr, affectAttrNameStr] = relationTable[0][0]
    .split('/')
    .map(name => name.trim());
  const dependAttrNames = dependAttrNameStr.split(',').map(name => name.trim());
  const affectAttrNames = affectAttrNameStr.split(',').map(name => name.trim());
  // As the table could be very large and dence
  // for preformance issue, we only store the available
  // affect attribute value idx in relationData
  const affectAttrValues = relationTable[0];
  affectAttrValues.shift();
  const relationData = {};
  for (let row = 1; row < relationTable.length; ++row) {
    const dependAttrValues = relationTable[row][0]
      .split(',')
      .map(name => name.trim());
    let currentDataNode = relationData;
    for (let dependIdx = 0; dependIdx < dependAttrValues.length; ++dependIdx) {
      const dependAttrValue = dependAttrValues[dependIdx];
      if (!currentDataNode[dependAttrValue])
        currentDataNode[dependAttrValue] =
          dependIdx === dependAttrValues.length - 1 ? [] : {};
      currentDataNode = currentDataNode[dependAttrValue];
    }
    for (let col = 1; col < relationTable[row].length; ++col)
      if (!!relationTable[row][col]) currentDataNode.push(col - 1);
  }
  return {
    dependAttrNames,
    affectAttrNames,
    affectAttrValues,
    relationData,
  };
}
// convert one-many, many-one or many-many relationship into multi one-one relationship
function decoupleTableData(tableDatas) {
  const decoupledTableData = tableDatas.map(decoupleAttrs);
  // flat nested table data
  return [].concat.apply([], decoupledTableData);
}
// expand the multi dependAttribute to a chain of one-one relationship by expand
// the in between dependAttribute
// i.e. convert op1/op2 -> op3 to op1 -> op2 -> op3, by expand all values of op2
// by op1
function decoupleAttrs(tableData) {
  const {
    dependAttrNames,
    affectAttrNames,
    affectAttrValues,
    relationData,
  } = tableData;
  const decoupledDataArray = [];
  const attrExpansion = [];
  let currentRelationData = relationData;
  for (let idx = 0; idx < dependAttrNames.length - 1; ++idx) {
    const dependAttrName = dependAttrNames[idx];
    const flatData = flattenNestedRelationData(currentRelationData);
    const expandRelationData = createExpandRelationData(
      currentRelationData,
      flatData.affectAttrValues.length
    );
    const dependAttrExpansion = [].concat(attrExpansion);
    attrExpansion.push({
      attrName: dependAttrName,
      attrValues: findAttrExpansionBase(Object.keys(currentRelationData)),
    });
    currentRelationData = flatData.relationData;
    decoupledDataArray.push({
      dependAttrName,
      affectAttrName: dependAttrNames[idx + 1],
      affectAttrValues: flatData.affectAttrValues,
      relationData: expandRelationData,
      dependAttrExpansion,
      affectAttrExpansion: [].concat(attrExpansion),
    });
  }
  for (let idx = 0; idx < affectAttrNames.length; ++idx) {
    decoupledDataArray.push({
      dependAttrName: dependAttrNames[dependAttrNames.length - 1],
      affectAttrName: affectAttrNames[idx],
      relationData: currentRelationData,
      affectAttrValues,
      affectAttrExpansion: [],
      dependAttrExpansion: [].concat(attrExpansion),
    });
  }
  return decoupledDataArray;
}
function findAttrExpansionBase(coupledNames) {
  const attrValues = {};
  return coupledNames
    .map(name =>
      name.substr(name.lastIndexOf(expandDivider) + expandDivider.length)
    )
    .filter(name => {
      if (!attrValues[name]) {
        attrValues[name] = true;
        return true;
      }
      return false;
    });
}
/**
 * In the case of coupled dependAttr, the relationData is nested
 * This function will flat the relationData with dimension of one
 * It is part of attribute value expansion for many-one case
 */
function flattenNestedRelationData(relationData) {
  const dependAttrValues = Object.keys(relationData);
  const affectAttrValuesMap = {};
  const expandRelationData = {};
  dependAttrValues.forEach(dependAttrValue => {
    const subRelationData = relationData[dependAttrValue];
    for (let affectAttrValue in subRelationData) {
      if (!affectAttrValuesMap[affectAttrValue])
        affectAttrValuesMap[affectAttrValue] = true;
      expandRelationData[
        `${dependAttrValue}${expandDivider}${affectAttrValue}`
      ] = subRelationData[affectAttrValue];
    }
  });
  const affectAttrValues = Object.keys(affectAttrValuesMap);
  return {
    affectAttrValues,
    relationData: expandRelationData,
  };
}
// create a relationData when attribute expansion needed
// This is a full mapping table
function createExpandRelationData(relationData, expansionNum) {
  const expandRelationData = {};
  // an array of [0,1,2,...,n-1]
  const idxBase = Array.from(Array(expansionNum).keys());
  Object.keys(relationData).forEach((dependAttrValue, idx) => {
    expandRelationData[dependAttrValue] = [].concat(idxBase);
  });
  return expandRelationData;
}
// expand an existing relationData when attribute expansion needed,
// the attribute relation will keep the same as current
function expandExistRelationData(
  relationData,
  dependAttrExpansion,
  affectAttrExpansion,
  affectAttrValueNum
) {
  if (!dependAttrExpansion.length && !affectAttrExpansion.length)
    return relationData;
  let expandRelationData = relationData;
  // expand relationData in dependAttr dimension
  for (let idx = dependAttrExpansion.length - 1; idx >= 0; --idx) {
    expandRelationData = dependAttrExpansion[idx].attrValues.reduce(
      (expandData, prefixValue) => {
        const expandSubData = Object.keys(expandRelationData).reduce(
          (subData, postfixValue) => {
            subData[`${prefixValue}${expandDivider}${postfixValue}`] =
              expandRelationData[postfixValue];
            return subData;
          },
          {}
        );
        Object.assign(expandData, expandSubData);
        return expandData;
      },
      {}
    );
  }
  //expand relationData in affectAttr dimension
  let affectAttrValueExpandLength = affectAttrValueNum;
  for (let idx = affectAttrExpansion.length - 1; idx >= 0; --idx)
    affectAttrValueExpandLength *= affectAttrExpansion[idx].attrValues.length;
  const relationKeys = Object.keys(expandRelationData);
  for (let idx = 0; idx < relationKeys.length; ++idx) {
    const key = relationKeys[idx];
    expandRelationData[key] = expandRelationData[key].map(
      value => (value + idx * affectAttrValueNum) % affectAttrValueExpandLength
    );
  }
  return expandRelationData;
}
function expandAttrValues(affectAttrValues, affectAttrExpansion) {
  let expandAffectAttrValues = affectAttrValues;
  for (let idx = affectAttrExpansion.length - 1; idx >= 0; --idx) {
    // create all value combination from with attribute values, output in matrix form: [[]]
    expandAffectAttrValues = affectAttrExpansion[idx].attrValues.map(
      prefixValue =>
        expandAffectAttrValues.map(postfixValue => {
          return `${prefixValue}${expandDivider}${postfixValue}`;
        })
    );
    // flatten the matrix into a single array
    expandAffectAttrValues = [].concat.apply([], expandAffectAttrValues);
  }
  return expandAffectAttrValues;
}
// When there are relationship chain, make sure the tableData are in correct order
// For independent relationship chain, it doesn't change the order.
// i.e. given the following relationships [F->G, C->D, B->C, A->B, B->E, G->H], the function will
// output [F->G, G->H, A->B, B->C, C->D, B->E]
function sortTables(tableDatas) {
  /**
   * a tree structure with js object. with above example, the final tree will look like
   * {
   *   F: {
   *     G: {
   *       H: {}
   *     }
   *   }
   *   A: {
   *     B: {
   *       C: {
   *         D: {}
   *       }
   *       E: {}
   *     }
   *   }
   * }
   */
  const relationTree = {};
  /**
   * a hashmap using js Object. key: all attribute, value: rootNode in relationTree for that attribute
   * with above example, the final map will be
   * {
   *   F: tree.F,
   *   G: tree.F.G,
   *   H: tree.F.G.H,
   *   A: tree.A,
   *   B: tree.A.B,
   *   C: tree.A.B.C,
   *   D: tree.A.B.C.D,
   *   E: tree.A.B.E,
   * }
   */
  const relationHashMap = {}; // key: dependAttrName, value: rootNode in relationTree for that dependAttrName
  for (let idx = 0; idx < tableDatas.length; ++idx) {
    const { dependAttrName, affectAttrName } = tableDatas[idx];
    if (!relationHashMap[affectAttrName]) {
      relationHashMap[affectAttrName] = {};
    } else if (relationTree[affectAttrName])
      delete relationTree[affectAttrName];
    if (!relationHashMap[dependAttrName]) {
      relationHashMap[dependAttrName] = {};
      relationTree[dependAttrName] = relationHashMap[dependAttrName];
    }
    relationHashMap[dependAttrName][affectAttrName] =
      relationHashMap[affectAttrName];
  }
  // as traversed result will be an array of dependName and affectName pair
  // convert tableData to object based on above pair for reorder
  const tableDataAsObj = tableDatas.reduce((tableObjs, tableData) => {
    const { dependAttrName, affectAttrName } = tableData;
    if (!tableObjs[dependAttrName]) tableObjs[dependAttrName] = {};
    if (!tableObjs[dependAttrName][affectAttrName])
      tableObjs[dependAttrName][affectAttrName] = [];
    tableObjs[dependAttrName][affectAttrName].push(tableData);
    return tableObjs;
  }, {});
  const sortedTableData = traverseRelationTree(relationTree).map(
    ([dependAttrName, affectAttrName]) =>
      tableDataAsObj[dependAttrName][affectAttrName]
  );
  // flat nested array
  return [].concat.apply([], sortedTableData);
}
// return an array of dependAttrName and affectAttrName pair in the desire order
function traverseRelationTree(relationTree) {
  const traversedArray = [];
  function traverseTree(nodeName, nodeValue) {
    const childNodeNames = Object.keys(nodeValue);
    childNodeNames.forEach(childNodeName => {
      traversedArray.push([nodeName, childNodeName]);
      traverseTree(childNodeName, nodeValue[childNodeName]);
    });
  }
  Object.keys(relationTree).forEach(nodeName =>
    traverseTree(nodeName, relationTree[nodeName])
  );
  return traversedArray;
}
// as many-one relation will be convert to a one-one chain with expansion,
// it may conflict with a separate one-one relationship, both duplication and expansion
function updateTables(tableDatas) {
  // this loop collect duplicate and expansion information
  const duplicateInfos = {};
  const expansionInfos = {};
  tableDatas.forEach((tableData, idx) => {
    const {
      affectAttrName,
      affectAttrExpansion,
      dependAttrName,
      dependAttrExpansion,
    } = tableData;
    // get expansionInfo
    if (
      !expansionInfos[affectAttrName] ||
      expansionInfos[affectAttrName].length < affectAttrExpansion.length
    )
      expansionInfos[affectAttrName] = affectAttrExpansion;
    if (
      !expansionInfos[dependAttrName] ||
      expansionInfos[dependAttrName].length < dependAttrExpansion.length
    )
      expansionInfos[dependAttrName] = dependAttrExpansion;
    // get duplicationInfos
    if (!duplicateInfos[dependAttrName]) duplicateInfos[dependAttrName] = {};
    if (!duplicateInfos[dependAttrName][affectAttrName])
      duplicateInfos[dependAttrName][affectAttrName] = [idx];
    else duplicateInfos[dependAttrName][affectAttrName].push(idx);
  });
  // this loop solve the potension potential conflic
  // Applying the same expansion on the each attribute
  tableDatas.forEach(tableData => {
    const {
      affectAttrName,
      affectAttrValues,
      dependAttrName,
      relationData,
      dependAttrExpansion,
      affectAttrExpansion,
    } = tableData;
    const finalDependExpansion = expansionInfos[dependAttrName];
    const finalAffectExpansion = expansionInfos[affectAttrName];
    if (
      affectAttrExpansion.length !== finalAffectExpansion.length &&
      affectAttrExpansion.length
    )
      return console.error(
        `Affect expansion error: ${dependAttrName} -> ${affectAttrName}!`
      );
    if (
      dependAttrExpansion.length !== finalDependExpansion.length &&
      dependAttrExpansion.length
    )
      return console.error(
        `Depend expansion error: ${dependAttrName} -> ${affectAttrName}!`
      );
    tableData.affectAttrValues = expandAttrValues(
      affectAttrValues,
      finalAffectExpansion
    );
    tableData.relationData = expandExistRelationData(
      relationData,
      finalDependExpansion.length === dependAttrExpansion.length
        ? []
        : finalDependExpansion,
      finalAffectExpansion,
      affectAttrValues.length
    );
    tableData.affectAttrExpansion = finalAffectExpansion;
    tableData.dependAttrExpansion = finalDependExpansion;
  });
  // this loop solve the potential duplication conflict
  // merge the relationData and remove the duplicate tables
  // merge take the && logic, so that the final merged relationData
  // has a valid value at a certain entry if all the duplicate table
  // has valid value at that entry.
  const updatedTables = [];
  for (let idx = 0; idx < tableDatas.length; ++idx) {
    const { affectAttrName, dependAttrName } = tableDatas[idx];
    const duplicate = duplicateInfos[dependAttrName][affectAttrName];
    if (duplicate.length === 1) {
      updatedTables.push(tableDatas[idx]);
      continue;
    } else if (idx !== duplicate[0]) continue;
    const mergedRelationData = Object.keys(tableDatas[idx].relationData).reduce(
      (counter, key) => {
        counter[key] = [];
        return counter;
      },
      {}
    );
    for (
      let duplicateIdx = 0;
      duplicateIdx < duplicate.length;
      ++duplicateIdx
    ) {
      const duplicateRelationData =
        tableDatas[duplicate[duplicateIdx]].relationData;
      Object.keys(duplicateRelationData).forEach(key => {
        duplicateRelationData[key].forEach(location => {
          if (!mergedRelationData[key][location])
            mergedRelationData[key][location] = 1;
          else mergedRelationData[key][location] += 1;
        });
      });
    }
    Object.keys(mergedRelationData).forEach(key => {
      mergedRelationData[key] = mergedRelationData[key].reduce(
        (relationRow, count, location) => {
          if (count === duplicate.length) relationRow.push(location);
          return relationRow;
        },
        []
      );
    });
    updatedTables.push(
      Object.assign({}, tableDatas[idx], { relationData: mergedRelationData })
    );
  }
  return updatedTables;
}
function initAttributeFromTables(tableDatas) {
  const attrValuesSet = {};
  tableDatas.forEach(
    ({ dependAttrName, affectAttrName, affectAttrValues, relationData }) => {
      const dependAttr = api.configuration.getAttribute(dependAttrName);
      const affectAttr = api.configuration.getAttribute(affectAttrName);
      const dependAttrValues = Object.keys(relationData);
      if (!attrValuesSet[dependAttrName]) {
        Object.assign(dependAttr, {
          values: dependAttrValues,
          defaultValue: dependAttrValues[0],
          valueActions: dependAttrValues.reduce((actions, value) => {
            actions[value] = [];
            return actions;
          }, {}),
        });
        attrValuesSet[dependAttrName] = true;
      }
      if (!attrValuesSet[affectAttrName]) {
        Object.assign(affectAttr, {
          values: affectAttrValues,
          defaultValue: affectAttrValues[0],
          valueActions: affectAttrValues.reduce((actions, value) => {
            actions[value] = [];
            return actions;
          }, {}),
        });
        attrValuesSet[affectAttrName] = true;
        api.configuration.setAttribute(affectAttr.id, affectAttr);
      }
      Object.keys(dependAttr.valueActions).forEach(dependValue => {
        let relationIdx, totalIdx;
        relationIdx = totalIdx = 0;
        const relationRow = relationData[dependValue];
        const visibilityValue = {};
        if (relationRow === undefined) debugger;
        while (totalIdx < affectAttrValues.length) {
          const visible = relationRow[relationIdx] === totalIdx;
          visibilityValue[affectAttrValues[totalIdx++]] = visible;
          if (visible) ++relationIdx;
        }
        dependAttr.valueActions[dependValue].push({
          action: 'set-attribute-options-visibility',
          tags: affectAttr.id,
          value: visibilityValue,
        });
      });
      api.configuration.setAttribute(dependAttr.id, dependAttr);
    }
  );
  const forms = [
    api.configuration.getForm('Bottle'),
    api.configuration.getForm('Patches'),
    api.configuration.getForm('Background'),
    api.configuration.getForm('Mobile'),
  ];
  forms.forEach(form => {
    form.fields
      .filter(field => field.displayAs === 'Images')
      .forEach(field => {
        const metadata = field.attribute.values.reduce((meta, value) => {
          const prefix = field.attribute.name.substr(
            0,
            field.attribute.name.length - 1
          );
          if (prefix === 'Flavour')
            meta[value] = `${prefix}_${value.split('_')[1]}.png`;
          else meta[value] = `${prefix}_${value}.svg`;
          return meta;
        }, {});
        field.metadata = metadata;
      });
    api.configuration._.setForm(form.id, form);
  });
  const flavoursAttribute = api.configuration.getAttribute('Flavours');
  Object.values(flavoursAttribute.valueActions).forEach(value => {
    value.push(
      {
        action: 'set-product',
        tags: 'product_data',
        value: 1,
      },
      {
        action: 'select-variant',
        tags: 'product_variant',
        value: '',
      }
    );
  });
  api.configuration.setAttribute(flavoursAttribute.id, flavoursAttribute);
}
function updateConfigurationFromSheets() {
  fetch(`${googleSheetApiRoot}?key=${apiKey}`)
    .then(sheetRes => sheetRes.json())
    .then(({ error, sheets }) => {
      if (error) {
        throw new Error(`Get sheetData error: ${error.message}!`);
      }
      const batchGetQuery =
        sheets.map(sheet => `ranges=${sheet.properties.title}`).join('&') +
        `&key=${apiKey}`;
      fetch(`${googleSheetApiRoot}/values:batchGet?${batchGetQuery}`)
        .then(valueRes => valueRes.json())
        .then(({ error, valueRanges }) => {
          if (error) {
            throw new Error(`Get sheetValues error: ${error.message}!`);
          }
          const tables = valueRanges.map(valueRange => valueRange.values);
          initConfigurationFromTables(tables);
          alert('Configuration updated!');
          reInitConfig();
        });
    })
    .catch(error => {
      const backupTables = JSON.parse(backupData).map(
        valueRange => valueRange.values
      );
      initConfigurationFromTables(backupTables);
      alert(`${error} Use Backup Data!`);
      reInitConfig();
    });
}

function reInitConfig() {
  const COLLECTIONS = 'Collections';
  const collectionAttr = api.configuration.getAttribute(COLLECTIONS);
  collectionAttr &&
    api.configuration.setConfiguration({
      [COLLECTIONS]: collectionAttr.values[0],
    });
}

function configChangeHandler([attr, value]) {
  let parsedValue;
  let queryObj;
  switch (attr.name) {
    case 'Flavours':
      parsedValue = value.substr(value.lastIndexOf(expandDivider) + 1);
      queryObj = {
        id: api.scene.find('Flavour_Decal_Texture'),
        plug: 'Material',
      };
      api.scene.set(
        { ...queryObj, property: 'baseMap' },
        api.scene.find(`Flavours_Bottle_${parsedValue}.jpg`)
      );
      api.scene.set(
        { ...queryObj, property: 'opacityMap' },
        api.scene.find(`Flavours_Alpha_${parsedValue}.jpg`)
      );
      api.scene.set(
        {
          id: api.scene.find('Cap_Texture'),
          plug: 'Material',
          property: 'baseMap',
        },
        api.scene.find(`Flavours_Cap_${parsedValue}.jpg`)
      );
      api.scene.set(
        {
          id: api.scene.find('CirocOrb'),
          plug: 'Material',
          property: 'baseMap',
        },
        api.scene.find(`Flavours_Orb_${parsedValue}.jpg`)
      );

      api.scene.set(
        {
          id: api.scene.find('GlassTextured'),
          plug: 'Material',
          property: 'baseMap',
        },
        api.scene.find(`Flavours_Textured_${parsedValue}.png`)
      );
      api.scene.set(
        {
          id: api.scene.find('GlassTextured'),
          plug: 'Material',
          property: 'baseMap',
        },
        api.scene.find(`Flavours_Textured_${parsedValue}.png`)
      );
      break;
    case 'Backgrounds':
      parsedValue = `Background_${value}.svg`;
      queryObj = {
        id: api.scene.find('Canvas_Decals'),
        plug: 'Image',
        properties: { name: 'Backgrounds' },
        property: 'sourceImage',
      };
      api.scene.set(queryObj, api.scene.find(parsedValue));
      break;
    case 'Patch1':
    case 'Patch2':
    case 'Patch3':
    case 'Patch4':
    case 'Patch5':
    case 'Patch6':
    case 'Patch7':
      parsedValue = `Patch_${value}.svg`;
      queryObj = {
        id: api.scene.find('Canvas_Decals'),
        plug: 'Image',
        properties: { name: attr.name },
        property: 'sourceImage',
      };
      api.scene.set(queryObj, api.scene.find(parsedValue));
      break;
    case 'Fonts':
      parsedValue = `Font_${value}.ttf`;
      queryObj = {
        id: api.scene.find('Canvas_Text'),
        plug: 'Image',
        properties: { name: 'main' },
        property: 'fontFile',
      };
      api.scene.set(queryObj, api.scene.find(parsedValue));
      break;
    default:
  }
}
api.on('configurationChange', configChangeHandler);
api.on('Reload Configurator', () => updateConfigurationFromSheets());

function getPdfData() {
  const pdfData = {};
  const decalCanvasId = api.scene.find('Canvas_Decals');
  if (!decalCanvasId)
    throw new Error('Missing canvas with name Canvas_Decals in the scene!');
  const textCanvasId = api.scene.find('Canvas_Text');
  if (!textCanvasId)
    throw new Error('Missing canvas with name Canvas_Text in the scene!');
  const config = api.configuration.getConfiguration();
  const assets = [
    'Backgrounds',
    'Patch1',
    'Patch2',
    'Patch3',
    'Patch4',
    'Patch5',
    'Patch6',
    'Patch7',
  ].reduce((assetData, assetName) => {
    const operatorProperty = api.scene.get({
      id: decalCanvasId,
      plug: 'Image',
      properties: { name: assetName },
    });
    if (!operatorProperty)
      throw new Error(`Canvas_Decals missing operator with name ${assetName}!`);
    const assetId = api.scene.get({
      id: operatorProperty.sourceImage,
      evalPlug: 'Image',
      property: 'originalAsset',
    });
    assetData[assetName] = {
      assetUrl: api.assets.getUrl(assetId),
      coordinates: {
        rotation: operatorProperty.rotation,
        scale: operatorProperty.windowRelativeWidth,
        x: operatorProperty.xRelativeOffset,
        y: operatorProperty.yRelativeOffset,
      },
    };
    return assetData;
  }, {});
  pdfData.backgroundData = { assetUrl: assets.Backgrounds.assetUrl };
  delete assets.Backgrounds;
  pdfData.decalData = Object.entries(assets).reduce(
    (decalData, [patchName, values]) => {
      const decalName = 'decal' + patchName[patchName.length - 1];
      decalData[decalName] = values;
      return decalData;
    },
    {}
  );

  const canvasTextProperty = api.scene.get({
    id: textCanvasId,
    plug: 'Image',
    properties: { name: 'main' },
  });
  const fontAssetId = api.scene.get({
    id: canvasTextProperty.fontFile,
    plug: 'Font',
    property: 'fontAsset',
  });

  pdfData.textData = {
    textContent: canvasTextProperty.text,
    color: canvasTextProperty.color,
    fontSize: canvasTextProperty.fontSize,
    fontFamily: config.Fonts,
    assetUrl: api.assets.getUrl(fontAssetId),
    canvasHeight: api.scene.get({
      id: textCanvasId,
      plug: 'Image',
      property: 'height',
    }),
  };
  return pdfData;
}

const PRODUCT_ID = '5c07f5d9c2fa1e0001926f36';
const SCENE_ID = api.sceneIO.getSceneId();
const ORDER_API_URL = 'https://mythreekit.com/api/organizations/ciroc/orders';

function postOrder(customInfo) {
  const { name, email } = customInfo;

  if (!name) throw new error(`Post order error! Missing customer name!`);

  if (!email) throw new error(`Post order error! Missing customer email!`);

  const configuration = api.configuration.getConfiguration();
  const pdfData = getPdfData();

  return new Promise((resolve, reject) => {
    const body = {
      customer: customInfo,
      productId: PRODUCT_ID,
      sceneId: SCENE_ID,
      configuration,
      metadata: { pdfData },
    };

    fetch(ORDER_API_URL, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then(res => {
        resolve(res);
      })
      .catch(err => reject(err));
  });
}

window.threekit = {
  postOrder,
  getPdfData,
};
